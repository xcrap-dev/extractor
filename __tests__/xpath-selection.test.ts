import {
    HtmlExtractionModel,
    HtmlParser,
    extractInnerHtml,
    extractOuterHtml,
    extractText,
    fromNextElementSibling,
    fromPreviousElementSibling,
    xpath,
} from "../src"

describe("XPath selection", () => {
    const html = `<html><body>
        <dl><dt>Brand</dt><dd>Acme &amp; Co</dd><dt>Model</dt><dd>X1</dd></dl>
        <div class="card" data-id="1"><span>One</span><img src="a.png"><p>after img</p></div>
        <div class="card" data-id="2"><span>Two</span></div>
    </body></html>`

    test("returns the original elements, so sibling navigation works", async () => {
        const parser = new HtmlParser(html)

        const brand = await parser.extractValue({
            query: xpath("//dt[text()='Brand']"),
            extractor: fromNextElementSibling(extractText),
        })
        const label = await parser.extractValue({
            query: xpath("//dd[text()='X1']"),
            extractor: fromPreviousElementSibling(extractText),
        })

        expect(brand).toBe("Acme & Co")
        expect(label).toBe("Model")
    })

    test("matches text with entities decoded", async () => {
        const parser = new HtmlParser(html)

        const value = await parser.extractValue({
            query: xpath("//dd[text()='Acme & Co']/preceding-sibling::dt[1]"),
            extractor: extractText,
        })

        expect(value).toBe("Brand")
    })

    test("keeps the original markup of matched elements (void tags included)", async () => {
        const parser = new HtmlParser(html)

        const inner = await parser.extractValue({ query: xpath("//div[@data-id='1']"), extractor: extractInnerHtml })
        const outer = await parser.extractValue({ query: xpath("//div[@data-id='2']"), extractor: extractOuterHtml })

        expect(inner).toBe(`<span>One</span><img src="a.png"><p>after img</p>`)
        expect(outer).toBe(`<div class="card" data-id="2"><span>Two</span></div>`)
    })

    test("works for nested models with multiple matches", async () => {
        const cardModel = new HtmlExtractionModel({
            name: { query: xpath("//span"), extractor: extractText },
        })

        const model = new HtmlExtractionModel({
            cards: { query: xpath("//div[@class='card']"), multiple: true, model: cardModel },
        })

        expect(await model.extract(html)).toEqual({ cards: [{ name: "One" }, { name: "Two" }] })
    })

    test("exposes non-element results as text", async () => {
        const parser = new HtmlParser(html)

        const ids = await parser.extractValues({ query: xpath("//div/@data-id"), extractor: extractText })
        const count = await parser.extractValue({ query: xpath("count(//div)"), extractor: extractText })

        expect(ids).toEqual(["1", "2"])
        expect(count).toBe("2")
    })

    test("returns an empty list or the default when nothing matches", async () => {
        const parser = new HtmlParser(html)

        expect(await parser.extractValues({ query: xpath("//table"), extractor: extractText })).toEqual([])
        expect(await parser.extractValue({ query: xpath("//table"), extractor: extractText, default: null })).toBeNull()
    })
})
