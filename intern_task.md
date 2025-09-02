# Intern Task: Implement the code without Airtable or Wati

If the existing code relies on Airtable for storage or Wati for messaging and you don’t have access to those services, you can still run and test the code by substituting them with simpler, self-hosted, or mock alternatives. Follow these steps:

## 1. Replace Airtable with a local data store
- **Local CSV/JSON files**: Store records in a structured JSON or CSV file. Use built-in modules or libraries to load and update the data.
- **SQLite**: A lightweight file-based database. Map the original Airtable schema to SQL tables and use SQLite bindings to interact with it.

## 2. Replace Wati (WhatsApp API) with an alternative or a mock
- **Mock service**: Create a local function that simulates sending messages and logs them to a file or console.
- **Other messaging APIs**: If full functionality is needed, use another service like Twilio's WhatsApp API or Signal CLI, making sure to check licensing and usage requirements.

## 3. Structure the code for easy substitution
- Abstract external service calls behind interfaces or helper functions (e.g., `send_message`, `fetch_records`).
- Write “production” implementations for real services and “test” implementations for local mocks.
- Use dependency injection or configuration flags to switch between real and mock implementations.

## 4. Test hosting and error handling
- **Local hosting**: Run the application on a local server and confirm that mocked or local services are reachable.
- **Error simulation**: Introduce bad inputs or incorrect configurations to see how the system handles failures. Use unit tests and log errors for debugging.

## 5. Document the testing workflow
- Provide instructions or scripts for setting up the local environment.
- Include steps to run the application in mock mode and instructions for verifying outputs (log files, console messages, SQLite inspection).
- Encourage testers to modify or extend the mocks to simulate additional failure modes.

By isolating external services behind clear interfaces and providing local substitutes, you can evaluate developers’ ability to run the code, identify errors, and adapt it to different environments—even without Airtable or Wati.
