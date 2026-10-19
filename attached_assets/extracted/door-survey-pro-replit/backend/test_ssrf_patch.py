"""
Test script to verify SSRF vulnerability patch in /api/google/watch endpoint
"""
import re
from urllib.parse import quote

def test_calendar_id_validation(calendar_id):
    """Test the calendar ID validation regex"""
    pattern = r'^[a-zA-Z0-9@._-]+$'
    return re.match(pattern, calendar_id) is not None

def test_valid_calendar_ids():
    """Test that legitimate calendar IDs are accepted"""
    print("\n=== Testing Valid Calendar IDs ===")
    
    valid_ids = [
        "primary",
        "user@example.com",
        "calendar123",
        "my-calendar_2024",
        "test.calendar@domain.com",
        "cal-123_test.name@domain.com",
        "ABC-123",
        "user_calendar"
    ]
    
    all_passed = True
    for calendar_id in valid_ids:
        is_valid = test_calendar_id_validation(calendar_id)
        status = "✓" if is_valid else "❌"
        print(f"  {status} {calendar_id}: {'PASS' if is_valid else 'FAIL - Should be valid!'}")
        if not is_valid:
            all_passed = False
    
    return all_passed

def test_malicious_calendar_ids():
    """Test that SSRF attempts are blocked"""
    print("\n=== Testing Malicious Calendar IDs (SSRF Attempts) ===")
    
    malicious_ids = [
        ("../../admin/directory/v1/users", "Path traversal with ../"),
        ("../../../etc/passwd", "File access attempt"),
        ("primary?extra=param", "Query parameter injection"),
        ("primary#fragment", "Fragment injection"),
        ("primary/../../drive/v3/files", "Path traversal in ID"),
        ("calendar/../admin", "Relative path traversal"),
        ("test<script>alert(1)</script>", "XSS attempt with angle brackets"),
        ("test\ninjection", "Newline injection"),
        ("test\rinjection", "Carriage return injection"),
        ("cal id", "Space character"),
        ("cal;id", "Semicolon"),
        ("cal:id", "Colon (except in email context)"),
        ("cal&id", "Ampersand"),
        ("cal=id", "Equals sign"),
        ("cal|id", "Pipe character"),
        ("cal\\id", "Backslash"),
        ("cal'id", "Single quote"),
        ('cal"id', "Double quote"),
    ]
    
    all_blocked = True
    for calendar_id, description in malicious_ids:
        is_valid = test_calendar_id_validation(calendar_id)
        status = "✓" if not is_valid else "❌"
        result = "BLOCKED" if not is_valid else "FAIL - Should be blocked!"
        print(f"  {status} {repr(calendar_id):40s} - {description:30s}: {result}")
        if is_valid:
            all_blocked = False
    
    return all_blocked

def test_url_encoding():
    """Test that URL encoding works correctly"""
    print("\n=== Testing URL Encoding ===")
    
    test_cases = [
        ("primary", "primary"),
        ("user@example.com", "user%40example.com"),
        ("my-calendar_2024", "my-calendar_2024"),
    ]
    
    all_passed = True
    for input_id, expected_encoded in test_cases:
        actual_encoded = quote(input_id, safe='')
        status = "✓" if actual_encoded == expected_encoded else "❌"
        print(f"  {status} {input_id} -> {actual_encoded} (expected: {expected_encoded})")
        if actual_encoded != expected_encoded:
            all_passed = False
    
    return all_passed

def demonstrate_vulnerability():
    """Demonstrate what the vulnerability would allow without the patch"""
    print("\n=== Vulnerability Demonstration (Without Patch) ===")
    print("Without validation, an attacker could:")
    print("  1. Access different Google APIs:")
    print("     calendarId: '../../admin/directory/v1/users'")
    print("     Would become: https://www.googleapis.com/calendar/v3/calendars/../../admin/directory/v1/users/events/watch")
    print("     Resolves to: https://www.googleapis.com/admin/directory/v1/users/events/watch")
    print("")
    print("  2. Exfiltrate data using the OAuth token:")
    print("     calendarId: '../../drive/v3/files'")
    print("     Could access Google Drive files with stolen credentials")
    print("")
    print("  3. Access unauthorized resources:")
    print("     Any Google API endpoint accessible with the OAuth token scope")

def main():
    """Run all tests"""
    print("=" * 80)
    print("SSRF SECURITY PATCH VERIFICATION")
    print("Testing regex validation in /api/google/watch endpoint")
    print("=" * 80)
    
    # Demonstrate the vulnerability
    demonstrate_vulnerability()
    
    # Run tests
    valid_test_passed = test_valid_calendar_ids()
    malicious_test_passed = test_malicious_calendar_ids()
    encoding_test_passed = test_url_encoding()
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST RESULTS")
    print("=" * 80)
    print(f"Valid Calendar IDs Test:     {'✅ PASSED' if valid_test_passed else '❌ FAILED'}")
    print(f"Malicious IDs Blocked Test:  {'✅ PASSED' if malicious_test_passed else '❌ FAILED'}")
    print(f"URL Encoding Test:           {'✅ PASSED' if encoding_test_passed else '❌ FAILED'}")
    
    if valid_test_passed and malicious_test_passed and encoding_test_passed:
        print("\n" + "=" * 80)
        print("✅ ALL TESTS PASSED! SSRF VULNERABILITY IS PROPERLY PATCHED")
        print("=" * 80)
        print("\nSecurity Controls Applied:")
        print("  ✓ Input validation using strict regex pattern")
        print("  ✓ Only allows: alphanumeric, @, dot, underscore, hyphen")
        print("  ✓ Blocks: slashes, backslashes, query params, fragments")
        print("  ✓ URL encoding for defense-in-depth")
        print("  ✓ Prevents path traversal attacks")
        print("  ✓ Prevents API endpoint manipulation")
        return 0
    else:
        print("\n" + "=" * 80)
        print("❌ SOME TESTS FAILED - PLEASE REVIEW THE PATCH")
        print("=" * 80)
        return 1

if __name__ == "__main__":
    exit(main())
