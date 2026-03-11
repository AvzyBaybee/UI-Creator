<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/20cb120a-a8b4-49bd-a826-ea65528fd7ed

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

---

## AI Development Guidelines

This project is structured modularly to make it easy for AI agents to write and maintain code. When adding new features or making changes, please follow these rules:

1. **Keep it Modular:** Before adding code to an existing file, consider if it belongs in a separate component or utility file.
2. **Use Existing Utils:** Check `src/utils/` and `src/components/` before writing new math or UI logic. Use the existing OKLCH and Spline math whenever possible.
3. **Avoid Mega-files:** Do not dump everything into `App.tsx`. `App.tsx` should primarily handle the Konva stage, canvas rendering, and global state tracking.
