.PHONY: dev dev-backend dev-frontend test test-backend test-frontend lint lint-backend lint-frontend format

dev:
	npm run dev

dev-backend:
	npm run dev:backend

dev-frontend:
	npm run dev:frontend

test:
	npm run test

test-backend:
	npm run test:backend

test-frontend:
	npm run test:frontend

lint:
	npm run lint

lint-backend:
	npm run lint:backend

lint-frontend:
	npm run lint:frontend

format:
	npm run format
