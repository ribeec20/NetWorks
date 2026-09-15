import time
import logging

from firebase_functions import scheduler_fn, identity_fn
from firebase_functions.identity_fn import BeforeCreateResponse
from firebase_functions.options import set_global_options
from firebase_admin import initialize_app, firestore

from algorithm import compute_strength

set_global_options(max_instances=10)
app = initialize_app()
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Invite-only gate — blocks account creation for emails not on the allowlist
# ---------------------------------------------------------------------------

@identity_fn.before_user_created()
def before_user_created(event: identity_fn.AuthBlockingEvent) -> BeforeCreateResponse | None:
    """Reject sign-ups from emails that are not in the Firestore allowlist.

    To invite a user, add a document to the `allowlist` collection in Firestore
    with the document ID set to the user's email address (lowercased).
    The document can be empty or contain any metadata you like.
    """
    email = (event.data.email or "").strip().lower()
    if not email:
        raise identity_fn.HttpsError(
            code="invalid-argument",
            message="An email address is required to create an account.",
        )

    db = firestore.client()
    doc = db.collection("allowlist").document(email).get()

    if not doc.exists:
        logger.info(f"Blocked sign-up attempt from non-allowlisted email: {email}")
        raise identity_fn.HttpsError(
            code="permission-denied",
            message="This app is currently in invite-only beta. Please contact the team for access.",
        )

    logger.info(f"Allowlisted email signed up: {email}")
    return None

ALGORITHM_VERSION = "1.0.0"
SELF_ID = "self"


def _doc_to_dict(doc) -> dict:
    """Convert a Firestore document snapshot to a dict with its id."""
    data = doc.to_dict() or {}
    data["id"] = doc.id
    return data


def _process_user(db, user_id: str, now_ms: int) -> int:
    """Recalculate strength for all contacts of a single user.

    Returns the number of contacts processed.
    """
    user_ref = db.collection("users").document(user_id)
    contacts_ref = user_ref.collection("contacts")
    connections_ref = user_ref.collection("connections")

    # Load all contacts
    contacts = [_doc_to_dict(d) for d in contacts_ref.stream()]
    if not contacts:
        return 0

    # Load all connections to determine isDirect per contact
    connections = [_doc_to_dict(d) for d in connections_ref.stream()]
    direct_set: set[str] = set()
    for conn in connections:
        if conn.get("isDirect"):
            if conn.get("sourceId") == SELF_ID:
                direct_set.add(conn["targetId"])
            elif conn.get("targetId") == SELF_ID:
                direct_set.add(conn["sourceId"])

    admin_batch_docs = []
    contact_updates = []

    for contact in contacts:
        contact_id = contact["id"]

        # Load subcollections for this contact
        interactions = [
            _doc_to_dict(d)
            for d in contacts_ref.document(contact_id)
            .collection("interactions")
            .stream()
        ]
        builders = [
            _doc_to_dict(d)
            for d in contacts_ref.document(contact_id)
            .collection("builders")
            .stream()
        ]

        is_direct = contact_id in direct_set
        result = compute_strength(contact, interactions, builders, is_direct, now_ms)

        # Use user override if set
        effective_score = result.score
        user_override = contact.get("userStrengthOverride")
        if user_override is not None:
            effective_score = int(user_override)

        # Queue contact strength update
        contact_updates.append((contact_id, effective_score))

        # Queue admin snapshot
        admin_batch_docs.append({
            "userId": user_id,
            "contactId": contact_id,
            "computedScore": result.score,
            "effectiveScore": effective_score,
            "userOverride": user_override,
            "factors": result.factors,
            "contactSnapshot": {
                "dateFirstMet": contact.get("dateFirstMet"),
                "dateAdded": contact.get("dateAdded"),
                "interactionCount": len(interactions),
                "builderCount": len(builders),
                "isDirect": is_direct,
                "tags": contact.get("tags", []),
            },
            "shouldTransitionToDirect": result.should_transition_to_direct,
            "computedAt": now_ms,
            "algorithmVersion": ALGORITHM_VERSION,
        })

        # Handle referral -> direct transition
        if result.should_transition_to_direct:
            for conn in connections:
                src, tgt = conn.get("sourceId"), conn.get("targetId")
                is_self_conn = (src == SELF_ID and tgt == contact_id) or (
                    tgt == SELF_ID and src == contact_id
                )
                if is_self_conn and not conn.get("isDirect"):
                    connections_ref.document(conn["id"]).update(
                        {"isDirect": True, "updatedAt": now_ms}
                    )

    # Batch write contact strength updates
    batch = db.batch()
    for contact_id, score in contact_updates:
        batch.update(contacts_ref.document(contact_id), {
            "strength": score,
            "updatedAt": now_ms,
        })
    batch.commit()

    # Write admin snapshots
    admin_ratings_ref = db.collection("admin").document("strength").collection("ratings")
    admin_batch = db.batch()
    for doc_data in admin_batch_docs:
        admin_batch.set(admin_ratings_ref.document(), doc_data)
    admin_batch.commit()

    return len(contacts)


@scheduler_fn.on_schedule(schedule="every monday 03:00", memory=512, timeout_sec=540)
def weekly_strength_recalc(event: scheduler_fn.ScheduledEvent) -> None:
    """Weekly scheduled function to recalculate all relationship strength scores.

    Runs every Monday at 3:00 AM UTC. For each user:
    1. Computes strength for every contact using the 5-factor algorithm
    2. Updates contact.strength in Firestore
    3. Writes a snapshot to admin/strength/ratings for algorithm tuning
    """
    db = firestore.client()
    now_ms = int(time.time() * 1000)

    users = db.collection("users").stream()
    total_users = 0
    total_contacts = 0

    for user_doc in users:
        try:
            count = _process_user(db, user_doc.id, now_ms)
            total_users += 1
            total_contacts += count
        except Exception:
            logger.exception(f"Failed to process user {user_doc.id}")

    logger.info(
        f"Weekly strength recalc complete: {total_users} users, {total_contacts} contacts"
    )
