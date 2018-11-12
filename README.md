1. GET /rd/endpoints
2. automatically create custom API e.g. /{resource.if] + 's'/{resource.rt} + 's'/:id
3. PUT /mapping
4. fetch all resources: sensors should be read-only, actors read and write; positive and negative tests covering all error statuses (a PUT to a sensor should return "METHOD NOT ALLOWED" status etc.)
5. stop serving resources
6. try to fetch stopped resources -> gateway should return "BAD GATEWAY" status or similiar
7. start serving resources again
8. fetch resources
9. change return type of resources to non-json or whatever
10. fetch resources -> verify appropriate error status
11. PUT /mapping with empty mapping
12. all resources should return 404 now
