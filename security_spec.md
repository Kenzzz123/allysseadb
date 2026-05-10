# Security Specification - GameDB Pro

## Data Invariants
1. A **User** profile must exist for any authenticated user.
2. A **Character** must belong to a valid user.
3. **Logs** must record every character mutation.
4. **Transactions** must be between two valid characters and involving the owners.
5. **Admin Warnings** are triggered by suspicious behavior and only manageable by admins.
6. **Banned Emails** prevent specific users from accessing the system.

## The "Dirty Dozen" Payloads (Deny List)
1. Creating a user profile for someone else: `setDoc(doc(db, 'users', 'other_uid'), { ... })`
2. Updating own role to 'admin': `setDoc(doc(db, 'users', uid), { role: 'admin' }, { merge: true })`
3. Creating a character with a 1MB name: `{ name: 'A'.repeat(1024 * 1024) }`
4. Deleting another user's character: `deleteDoc(doc(db, 'characters', 'other_char_id'))`
5. Modifying a transaction after it's created.
6. Creating a log entry for an action that didn't happen or spoofing the author.
7. Reading all banned emails (not allowed for non-admins).
8. Listing all user profiles (not allowed for non-admins).
9. Updating `createdAt` timestamp after creation.
10. Directly modifying `admin_warnings` as a regular player.
11. Injecting arbitrary fields into characters (Shadow Update).
12. Setting `isSystem: true` on characters for a regular player.

## Red Team Verification Plan
- Verify that `isValidUser()` enforces all fields from the blueprint.
- Verify that `affectedKeys().hasOnly()` is used in every `allow update` action.
- Verify `isAdmin()` logic.
- Verify `isOwner()` logic.
