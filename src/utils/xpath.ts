import { CommentNode, HTMLElement, Node as HtmlNode, NodeType, TextNode } from "node-html-parser"
import { DOMImplementation } from "xmldom"
import htmlParser from "node-html-parser"
import * as xpathLib from "xpath"

type XpathDocument = {
    document: Document
    elements: Map<Node, HTMLElement>
}

/**
 * Mirrors a node-html-parser tree as an xmldom document, node by node, and remembers which
 * xmldom element stands for which original element. XPath runs on the mirror and its results
 * are mapped back, so the caller gets the original elements (with parent and siblings).
 */
function buildXpathDocument(root: HTMLElement): XpathDocument {
    const document = new DOMImplementation().createDocument(null, null as unknown as string, null)
    const elements = new Map<Node, HTMLElement>()

    const mirror = (source: HtmlNode, target: Node): void => {
        if (source.nodeType === NodeType.ELEMENT_NODE) {
            const element = source as HTMLElement

            if (!element.rawTagName) {
                for (const child of element.childNodes) mirror(child, target)
                return
            }

            const node = document.createElement(element.rawTagName)

            for (const [name, value] of Object.entries(element.attributes)) {
                node.setAttribute(name, value)
            }

            elements.set(node, element)
            target.appendChild(node)

            for (const child of element.childNodes) mirror(child, node)
        } else if (source.nodeType === NodeType.TEXT_NODE) {
            target.appendChild(document.createTextNode((source as TextNode).text))
        } else if (source.nodeType === NodeType.COMMENT_NODE) {
            target.appendChild(document.createComment((source as CommentNode).rawText))
        }
    }

    mirror(root, document)

    return { document, elements }
}

function toHtmlElement(result: unknown, elements: Map<Node, HTMLElement>): HTMLElement {
    const original = elements.get(result as Node)

    if (original) {
        return original
    }

    // Attribute, text or comment nodes, and string/number/boolean results: expose their text
    // through a detached element so text extractors keep working.
    const value =
        typeof result === "object" && result !== null
            ? ((result as Node).nodeValue ?? (result as Node).textContent ?? "")
            : String(result)

    const wrapper = htmlParser.parse("")
    wrapper.appendChild(new TextNode(value, wrapper))

    return wrapper
}

export function selectXpath(query: string, root: HTMLElement): HTMLElement[] {
    const { document, elements } = buildXpathDocument(root)
    const result = xpathLib.select(query, document)
    const items = Array.isArray(result) ? result : [result]

    return items.map((item) => toHtmlElement(item, elements))
}
