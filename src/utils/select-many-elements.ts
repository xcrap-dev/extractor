import { HTMLElement } from "node-html-parser"

import { BuildedQuery } from "../query-builders"
import { selectXpath } from "./xpath"

export function selectManyElements(query: BuildedQuery, root: HTMLElement): HTMLElement[] {
    if (query.type === "css") {
        return root.querySelectorAll(query.value)
    }

    return selectXpath(query.value, root)
}
