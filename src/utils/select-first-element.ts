import { HTMLElement } from "node-html-parser"

import { BuildedQuery } from "../query-builders"
import { selectXpath } from "./xpath"

export function selectFirstElement(query: BuildedQuery, root: HTMLElement): HTMLElement | null {
    if (query.type === "css") {
        return root.querySelector(query.value)
    }

    return selectXpath(query.value, root)[0] ?? null
}
