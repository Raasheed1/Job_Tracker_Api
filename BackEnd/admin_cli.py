#!/usr/bin/env python3
"""
admin_cli.py - Admin Management CLI for Job Tracker
=====================================================
Run this script from the BackEnd directory:

    python admin_cli.py

Commands available:
  1. List all admins
  2. Add a new admin
  3. Delete an admin
  4. Quit
"""

import sys
import os
import getpass

# ─── Bootstrap Flask app context ──────────────────────────────────────────────
# We add the BackEnd directory to the path so the app package is importable.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

try:
    from app import create_app, db
    from app.models.user import User
    from werkzeug.security import generate_password_hash
except ImportError as e:
    print(f"\n[ERROR] Could not import the Flask app: {e}")
    print("Make sure you run this script from the BackEnd directory and your venv is active.\n")
    sys.exit(1)

app = create_app()

# ─── ANSI colour helpers ───────────────────────────────────────────────────────
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

def c(text, colour):
    return f"{colour}{text}{RESET}"

def banner():
    print()
    print(c("╔══════════════════════════════════════════════════╗", CYAN))
    print(c("║       Job Tracker  –  Admin Management CLI       ║", CYAN))
    print(c("╚══════════════════════════════════════════════════╝", CYAN))
    print()

def menu():
    print(c("──────────────────────────────────────────────────", CYAN))
    print(c("  [1]", BOLD) + " List all admins")
    print(c("  [2]", BOLD) + " Add a new admin")
    print(c("  [3]", BOLD) + " Delete an admin")
    print(c("  [4]", BOLD) + " Quit")
    print(c("──────────────────────────────────────────────────", CYAN))
    return input("  Enter choice: ").strip()

# ─── Actions ──────────────────────────────────────────────────────────────────

def list_admins():
    """Print a table of all admin users."""
    with app.app_context():
        admins = User.query.filter_by(role='admin').order_by(User.id).all()

    if not admins:
        print(c("\n  No admin accounts found.\n", YELLOW))
        return

    # Table header
    print()
    print(c(f"  {'ID':<6} {'Email':<40} {'Created At'}", BOLD))
    print(c("  " + "-" * 70, CYAN))
    for a in admins:
        created = a.created_at.strftime("%Y-%m-%d %H:%M") if a.created_at else "-"
        print(f"  {a.id:<6} {a.email:<40} {created}")
    print(c(f"\n  Total: {len(admins)} admin(s)\n", CYAN))


def add_admin():
    """Interactively create a new admin account."""
    print(c("\n  ── Add New Admin ──", BOLD))

    email = input("  Email: ").strip()
    if not email:
        print(c("  [!] Email cannot be empty.\n", RED))
        return

    with app.app_context():
        existing = User.query.filter_by(email=email).first()
        if existing:
            if existing.role == 'admin':
                print(c(f"  [!] '{email}' is already an admin.\n", YELLOW))
                return
            # Upgrade existing user to admin
            confirm = input(c(f"  User '{email}' exists (role='{existing.role}'). Promote to admin? [y/N]: ", YELLOW)).strip().lower()
            if confirm != 'y':
                print(c("  Cancelled.\n", YELLOW))
                return
            existing.role = 'admin'
            db.session.commit()
            print(c(f"  ✔ '{email}' has been promoted to admin.\n", GREEN))
            return

    # Brand-new account
    while True:
        password = getpass.getpass("  Password (min 8 chars): ")
        if len(password) < 8:
            print(c("  [!] Password must be at least 8 characters.", RED))
            continue
        confirm_pw = getpass.getpass("  Confirm password: ")
        if password != confirm_pw:
            print(c("  [!] Passwords do not match.", RED))
            continue
        break

    with app.app_context():
        new_admin = User(
            email=email,
            password_hash=generate_password_hash(password),
            role='admin'
        )
        db.session.add(new_admin)
        db.session.commit()
        print(c(f"  ✔ Admin '{email}' created successfully (ID={new_admin.id}).\n", GREEN))


def delete_admin():
    """Interactively delete an admin account."""
    print(c("\n  ── Delete Admin ──", BOLD))
    list_admins()

    with app.app_context():
        admins = User.query.filter_by(role='admin').all()
        if not admins:
            return

    identifier = input("  Enter admin Email or ID to delete: ").strip()
    if not identifier:
        print(c("  [!] No input provided.\n", YELLOW))
        return

    with app.app_context():
        # Try by ID first, then by email
        admin = None
        if identifier.isdigit():
            admin = User.query.filter_by(id=int(identifier), role='admin').first()
        if not admin:
            admin = User.query.filter_by(email=identifier, role='admin').first()

        if not admin:
            print(c(f"  [!] No admin found for '{identifier}'.\n", RED))
            return

        confirm = input(c(f"  Are you sure you want to delete admin '{admin.email}' (ID={admin.id})? [y/N]: ", RED)).strip().lower()
        if confirm != 'y':
            print(c("  Cancelled.\n", YELLOW))
            return

        db.session.delete(admin)
        db.session.commit()
        print(c(f"  ✔ Admin '{admin.email}' deleted successfully.\n", GREEN))


# ─── Main loop ────────────────────────────────────────────────────────────────

def main():
    banner()
    while True:
        try:
            choice = menu()
        except (KeyboardInterrupt, EOFError):
            print(c("\n\n  Goodbye!\n", CYAN))
            break

        if choice == '1':
            list_admins()
        elif choice == '2':
            add_admin()
        elif choice == '3':
            delete_admin()
        elif choice == '4':
            print(c("\n  Goodbye!\n", CYAN))
            break
        else:
            print(c("  [!] Invalid choice, please enter 1–4.\n", YELLOW))


if __name__ == '__main__':
    main()
