/**
 * Anything that reaches here matched no route. Answer in the SAP error shape
 * so the client's existing sapErrorMessage() renders it without special-casing.
 */
export function notFound(req, res) {
    res.status(404).json({
        error: {
            code: "NOT_FOUND",
            message: {
                lang: "en-us",
                value: `No route for ${req.method} ${req.originalUrl}`,
            },
        },
    });
}

export default notFound;
