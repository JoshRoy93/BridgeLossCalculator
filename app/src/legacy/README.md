# Legacy code

The v1 API handlers are retained here for their reference tests. They are not Next.js routes and are absent from the v2 static site.

The v1 components, store and Imperial engine remain in their original source folders. The v2 entry point imports only `src/v2`. Tests for v1 preserve its recorded behaviour; they do not validate the v2 solver.
