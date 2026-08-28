import { PostSap } from "../auth/login.js";

/**
 * Fetch the document series defined in SAP B1 for a given document type.
 * Calls the Service Layer action SeriesService_GetDocumentSeries.
 *
 * @param {string|number} document        The document type (e.g. "2").
 * @param {string} [documentSubType="S"]  The document sub type (e.g. "S").
 * @returns {Promise<Array>} The list of document series.
 */
export async function getDocumentSeries(document, documentSubType = "") {
    const data = {
        DocumentTypeParams: {
            Document: String(document) || '2',
        },
    };

    if (documentSubType) {
        data.DocumentTypeParams.DocumentSubType = documentSubType;
    }

    return PostSap("/SeriesService_GetDocumentSeries", data);
}
