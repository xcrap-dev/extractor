import { HtmlExtractionModel, JsonExtractionModel, css, extractText } from "../src"

describe("JsonExtractionModel integration test", () => {
    test("should correctly map JSON properties", async () => {
        const json = JSON.stringify({ name: "Marcuth", age: 19, contact: { email: "test@email.com" } })

        const extractionModel = new JsonExtractionModel({
            username: {
                query: "name",
            },
            email: {
                query: "contact.email",
            },
            age: {
                query: "age",
            },
        })

        const data = await extractionModel.extract(json)

        expect(data).toEqual({
            username: "Marcuth",
            email: "test@email.com",
            age: 19,
        })
    })

    test("should return null for missing properties", async () => {
        const json = JSON.stringify({ name: "Marcuth" })

        const extractionModel = new JsonExtractionModel({
            username: {
                query: "name",
            },
            email: {
                query: "contact.email",
            },
        })

        const data = await extractionModel.extract(json)

        expect(data).toEqual({
            username: "Marcuth",
            email: null,
        })
    })

    test("should throw error for invalid JSON", async () => {
        const invalidJson = "{ name: 'Marcuth' "

        const extractionModel = new JsonExtractionModel({
            username: {
                query: "name",
            },
        })

        await expect(extractionModel.extract(invalidJson)).rejects.toThrow(SyntaxError)
    })
})

describe("JsonExtractionModel nested models", () => {
    const itemModel = new JsonExtractionModel({ id: { query: "id" }, name: { query: "info.name" } })

    test("applies a nested JSON model to every item with multiple", async () => {
        const model = new JsonExtractionModel({
            items: { query: "data", model: itemModel, multiple: true },
            firstTwo: { query: "data", model: itemModel, multiple: true, limit: 2 },
        })

        const source = JSON.stringify({
            data: [
                { id: 1, info: { name: "a" } },
                { id: 2, info: { name: "b" } },
                { id: 3, info: { name: "c" } },
            ],
        })

        expect(await model.extract(source)).toEqual({
            items: [
                { id: 1, name: "a" },
                { id: 2, name: "b" },
                { id: 3, name: "c" },
            ],
            firstTwo: [
                { id: 1, name: "a" },
                { id: 2, name: "b" },
            ],
        })
    })

    test("passes string values unchanged to non-JSON models", async () => {
        const htmlModel = new HtmlExtractionModel({ title: { query: css("b"), extractor: extractText } })

        const model = new JsonExtractionModel({
            snippets: { query: "snippets", model: htmlModel, multiple: true },
            snippet: { query: "snippets[0]", model: htmlModel },
        })

        const source = JSON.stringify({ snippets: ["<p><b>One</b></p>", "<p><b>Two</b></p>"] })

        expect(await model.extract(source)).toEqual({
            snippets: [{ title: "One" }, { title: "Two" }],
            snippet: { title: "One" },
        })
    })

    test("rejects non-string values for non-JSON models", async () => {
        const htmlModel = new HtmlExtractionModel({ title: { query: css("b"), extractor: extractText } })
        const model = new JsonExtractionModel({ items: { query: "items", model: htmlModel, multiple: true } })

        await expect(model.extract(JSON.stringify({ items: [{ a: 1 }] }))).rejects.toThrow("Expected a string")
    })
})
