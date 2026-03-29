# 🌿 ZenCash: Serenity Overhaul Implementation Plan

**Objective**: Fix the registration process 400 errors and perform a 10/10 visual overhaul of the ZenCash Landing Page.

---

## 🏗️ Phase 1: Backend & Security (Sanity Check)
- [ ] **Robust Logging**: Update `/api/auth/register` to log detailed validation errors to help debug the 400 Bad Request.
- [ ] **Schema Sync**: Verify `UserRegister` schema and its relationship with `UserService`.
- [ ] **Consistent Pathing**: Ensure SQLite `financial.db` is handled consistently across `main.py` and local testing.

## 🚀 Phase 2: Registration Experience (The End of 400)
- [ ] **Enhanced UI**: Re-style the registration page with the ZenCash palette.
- [ ] **User-friendly feedback**: Capture and display the specialized backend error messages (e.g., "Email já cadastrado").
- [ ] **Auto-flow**: Registration -> Dashboard or Stripe based on plan.

## 🎨 Phase 3: Landing Page "Zen-Premium" (Visual Refactor)
- [ ] **Design Tokens**: Implement new HSL variables in `globals.css` for ZenCash (Forest, Sage, Ivory).
- [ ] **Modern Hero**: Immersive experience with premium typography and glassmorphic navigation.
- [ ] **Component Polish**: 
  - [ ] **Bento Grid**: Features showcase.
  - [ ] **Pricing cards**: Minimalist cards with a "jewelry" feel.
  - [ ] **Testimonials**: Floating cards with smooth transitions.
- [ ] **Hero Asset**: Use `generate_image` for a top-tier visual asset.

## 🏁 Phase 4: Integration & Verification
- [ ] Verify CORS one last time (using '*' for local dev, strict for prod).
- [ ] Test the full funnel: Landing -> Select Plan -> Register -> Stripe -> Dashboard.
- [ ] Run Lighthouse audit for Performance & Accessibility.

---

## ⚡ Quick Task List
- [ ] `/backend/routes/auth.py`: Add Pydantic validation logging.
- [ ] `/frontend/src/app/globals.css`: Define ZenCash Premium palette.
- [ ] `/frontend/src/components/LandingPage.tsx`: Full JSX/CSS overhaul.
- [ ] `/frontend/src/app/register/page.tsx`: Robust error capture.
