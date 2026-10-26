# Frontend Automated Testing Guide (Katalon Recorder)

This guide documents how to execute the automated frontend tests for **NexTo** using **Katalon Recorder** against `http://localhost:5173`.

---

## 📋 Test Cases Overview

| Test ID | Test Name | Flow Covered | Proposal Mapping |
| :--- | :--- | :--- | :--- |
| **FE-01** | `FE-01_Register_And_Login` | Dynamic User Registration → Login verification → Welcome screen check → Logout | **Req 1.1, 1.2, 1.3** |
| **FE-02** | `FE-02_Profile_Management` | Registration → Login → Profile view (Sidebar + Stats cards) → Edit Full Name → Save & Confirm | **Req 2.1, 2.2, Mockup 6** |
| **FE-03** | `FE-03_Password_Change_And_Relogin` | Login → Navigate to Profile → Change Password (Rule 1.1.2) → Logout → Verify old password fails → Verify new password logs in | **Req 2.3, 1.1.2, 1.2** |

---

## 🚀 Quick Setup Instructions

### 1. Ensure NexTo Application is Running Locally
Make sure both the backend API and frontend client dev servers are active:
- **Server**: Running on `http://localhost:5000` (`npm run dev` in `server/`)
- **Client**: Running on `http://localhost:5173` (`npm run dev` in `client/`)

### 2. Install Katalon Recorder Extension
If not already installed, add the free extension to your browser:
- [Chrome / Edge Web Store: Katalon Recorder](https://chromewebstore.google.com/detail/katalon-recorder-selenium/ljdobflhhhnlgfdggpklgmghfchnffbe)
- [Firefox Add-ons: Katalon Recorder](https://addons.mozilla.org/en-US/firefox/addon/katalon-automation-record/)

### 3. Load the Test Suite into Katalon Recorder
1. Click the **Katalon Recorder** icon in your browser toolbar to open the runner window.
2. In the top toolbar, click **Open Test Suite** (or the folder icon 📂).
3. Browse to your project folder and select:
   `capstone-priyankpriyank/client/tests/katalon/NexTo_Katalon_Suite.json`
   *(Alternatively, you can open individual `.html` test cases from the same folder).*
4. Set the **Base URL** at the top of Katalon Recorder to:
   ```
   http://localhost:5173
   ```

### 4. Run the Automated Tests
1. Click **Play Suite** (the double play icon ▶️▶️) to run all 3 test cases sequentially, or click **Play** (▶️) on an individual test case.
2. Observe your browser running automatically:
   - Filling form fields
   - Submitting forms
   - Testing redirects
   - Verifying UI elements and confirmation messages
3. When complete, all steps will turn **green** in the test log table.

### 5. Exporting Evidence / Reports for Submission
1. In Katalon Recorder, click on the **Log** tab at the bottom.
2. Click **Export** to save the execution log text file or click **Report** to generate an HTML test execution report.
3. Save this report or take a screenshot of the green test results to include in your milestone submission.
