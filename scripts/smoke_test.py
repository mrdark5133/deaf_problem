#!/usr/bin/env python3
"""Smoke test script for SignBridge deployment verification.

Usage:
    python scripts/smoke_test.py [base_url]

Default base_url is http://127.0.0.1:10000
Exits 0 on success, non-zero on any failure.
"""

import json
import re
import sys
import time
import urllib.error
import urllib.request

# Ensure UTF-8 output on all terminal environments (including Windows cp1252)
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


def print_step(name: str, status: str, details: str = ""):
    icon = "[PASS]" if status == "PASS" else "[FAIL]"
    print(f"{icon} {name}{': ' + details if details else ''}")


def fetch_url(url: str, method: str = "GET", data: dict = None, timeout: int = 15):
    headers = {"User-Agent": "SignBridge-SmokeTest/1.0"}
    req_data = None
    if data is not None:
        req_data = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"

    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    start = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            status_code = response.getcode()
            body = response.read().decode("utf-8", errors="replace")
            latency_ms = (time.perf_counter() - start) * 1000
            return status_code, body, latency_ms
    except urllib.error.HTTPError as e:
        latency_ms = (time.perf_counter() - start) * 1000
        body = e.read().decode("utf-8", errors="replace")
        return e.code, body, latency_ms
    except Exception as e:
        latency_ms = (time.perf_counter() - start) * 1000
        raise RuntimeError(f"Connection error to {url}: {e}") from e


def run_smoke_test(base_url: str) -> bool:
    base_url = base_url.rstrip("/")
    print(f"\n[TEST] Running SignBridge Smoke Test against: {base_url}\n" + "=" * 60)
    all_passed = True

    # 1. Health check
    try:
        status, body, lat = fetch_url(f"{base_url}/health")
        if status == 200:
            data = json.loads(body)
            if data.get("status") == "ok":
                print_step("/health", "PASS", f"HTTP 200, status='ok' ({lat:.1f} ms)")
            else:
                print_step("/health", "FAIL", f"Unexpected body: {body}")
                all_passed = False
        else:
            print_step("/health", "FAIL", f"HTTP {status} ({lat:.1f} ms)")
            all_passed = False
    except Exception as e:
        print_step("/health", "FAIL", str(e))
        all_passed = False

    # 2. Sample /api/translate
    try:
        payload = {"text": "Hello, how are you?", "seq": 1}
        status, body, lat = fetch_url(f"{base_url}/api/translate", method="POST", data=payload)
        if status == 200:
            data = json.loads(body)
            tokens = data.get("tokens", [])
            glosses = [t.get("gloss") for t in tokens]
            print_step("/api/translate", "PASS", f"HTTP 200, tokens={glosses} ({lat:.1f} ms)")
        else:
            print_step("/api/translate", "FAIL", f"HTTP {status}, body={body}")
            all_passed = False
    except Exception as e:
        print_step("/api/translate", "FAIL", str(e))
        all_passed = False

    # 3. Root SPA HTML (/)
    html_content = ""
    try:
        status, body, lat = fetch_url(f"{base_url}/")
        if status == 200 and ("<html" in body.lower() or "<!doctype html" in body.lower()):
            html_content = body
            print_step("Root page (/)", "PASS", f"HTTP 200, HTML returned ({lat:.1f} ms)")
        else:
            print_step("Root page (/)", "FAIL", f"HTTP {status} (Expected HTML)")
            all_passed = False
    except Exception as e:
        print_step("Root page (/)", "FAIL", str(e))
        all_passed = False

    # 4. SPA Client Route (/recorder) - must return index.html, not 404
    try:
        status, body, lat = fetch_url(f"{base_url}/recorder")
        if status == 200 and ("<html" in body.lower() or "<!doctype html" in body.lower()):
            print_step("SPA route (/recorder)", "PASS", f"HTTP 200, fallback to index.html ({lat:.1f} ms)")
        else:
            print_step("SPA route (/recorder)", "FAIL", f"HTTP {status}")
            all_passed = False
    except Exception as e:
        print_step("SPA route (/recorder)", "FAIL", str(e))
        all_passed = False

    # 5. Missing /api/* route must return JSON 404, not HTML
    try:
        status, body, lat = fetch_url(f"{base_url}/api/nonexistent_endpoint_test")
        if status == 404:
            try:
                err_json = json.loads(body)
                if "detail" in err_json:
                    print_step("Unknown API route (/api/nonexistent)", "PASS", f"HTTP 404 JSON response ({lat:.1f} ms)")
                else:
                    print_step("Unknown API route (/api/nonexistent)", "PASS", f"HTTP 404 ({lat:.1f} ms)")
            except Exception:
                print_step("Unknown API route (/api/nonexistent)", "FAIL", "HTTP 404 returned non-JSON body")
                all_passed = False
        else:
            print_step("Unknown API route (/api/nonexistent)", "FAIL", f"Expected HTTP 404, got {status}")
            all_passed = False
    except Exception as e:
        print_step("Unknown API route (/api/nonexistent)", "FAIL", str(e))
        all_passed = False

    # 6. Check JS Asset from HTML
    try:
        js_match = re.search(r'src=["\'](/assets/[^"\']+\.js)["\']', html_content)
        if js_match:
            asset_path = js_match.group(1)
            status, _, lat = fetch_url(f"{base_url}{asset_path}")
            if status == 200:
                print_step(f"JS Asset ({asset_path})", "PASS", f"HTTP 200 ({lat:.1f} ms)")
            else:
                print_step(f"JS Asset ({asset_path})", "FAIL", f"HTTP {status}")
                all_passed = False
        else:
            # Try generic assets fetch or warn
            print_step("JS Asset discovery", "PASS", "HTML parsed (no direct /assets/*.js tag found or bundled inline)")
    except Exception as e:
        print_step("JS Asset", "FAIL", str(e))
        all_passed = False

    # 7. Sign Library Index (/data/signs/index.json)
    first_clip_id = None
    try:
        status, body, lat = fetch_url(f"{base_url}/data/signs/index.json")
        if status == 200:
            idx = json.loads(body)
            total = idx.get("total_signs", 0)
            signs = idx.get("signs", {})
            if isinstance(signs, dict) and len(signs) > 0:
                first_clip_id = list(signs.keys())[0]
            elif isinstance(signs, list) and len(signs) > 0:
                first_clip_id = signs[0].get("id") or signs[0].get("gloss")
            print_step("Sign library index (/data/signs/index.json)", "PASS", f"HTTP 200, {total} signs ({lat:.1f} ms)")
        else:
            print_step("Sign library index (/data/signs/index.json)", "FAIL", f"HTTP {status}")
            all_passed = False
    except Exception as e:
        print_step("Sign library index (/data/signs/index.json)", "FAIL", str(e))
        all_passed = False

    # 8. Single Sign Clip (/data/signs/<clip>.json)
    clip_name = first_clip_id or "hello"
    try:
        status, body, lat = fetch_url(f"{base_url}/data/signs/{clip_name}.json")
        if status == 200:
            clip = json.loads(body)
            frames = len(clip.get("frames", []))
            print_step(f"Sign clip (/data/signs/{clip_name}.json)", "PASS", f"HTTP 200, {frames} frames ({lat:.1f} ms)")
        else:
            print_step(f"Sign clip (/data/signs/{clip_name}.json)", "FAIL", f"HTTP {status}")
            all_passed = False
    except Exception as e:
        print_step(f"Sign clip (/data/signs/{clip_name}.json)", "FAIL", str(e))
        all_passed = False

    print("=" * 60)
    if all_passed:
        print("[SUCCESS] ALL SMOKE TESTS PASSED!")
    else:
        print("[FAILURE] SOME SMOKE TESTS FAILED!")
    return all_passed


if __name__ == "__main__":
    target_url = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:10000"
    success = run_smoke_test(target_url)
    sys.exit(0 if success else 1)
