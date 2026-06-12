# TODO - Nirikshak AI Production Hardening

## Phase 1: Audit (done)
- [x] Enumerate frontend features and pages
- [x] Enumerate backend features and routers
- [x] Identify deployment/model/session/auth risks

## Phase 2: Decision
- [x] Choose ML artifacts deployment location: backend/Models (Option A)

## Phase 3: Code changes (pending)
- [ ] Update `backend/app/config.py`
  - [x] Trim CORS origins
  - [x] Fail fast on missing `SUPABASE_JWT_SECRET` in production
  - [x] Fail fast on missing `GROQ_API_KEY` in production (or disable LLM routes gracefully)

- [ ] Update `backend/app/services/predictor.py`
  - [ ] Add thread-safe lock around model loading
  - [ ] Improve pickle load resource handling
- [ ] Update `backend/app/state.py`
  - [x] Replace in-memory session with persistent store (Redis)
  - [x] Preserve existing interface (`latest_results`, `latest_df`)

- [ ] Update `backend/app/main.py`
  - [x] Ensure startup validates model artifacts exist when in production

- [ ] Update frontend env handling
  - [ ] Remove localhost fallback for production
  - [ ] Improve missing env error messages

## Phase 4: Repo artifacts
- [ ] Ensure `backend/Models/*` exists and contains all .pkl files + feature_importance.csv
- [ ] Verify `.gitignore` does not exclude `backend/Models/*.pkl`

## Phase 5: Docs
- [ ] Update `README.md`
- [ ] Add `/.env.example` and `backend/.env.example` and document required Railway vars

## Phase 6: Deployment & Testing (pending)
- [ ] Railway deploy checklist completed
- [ ] Post-deploy endpoint test plan executed

