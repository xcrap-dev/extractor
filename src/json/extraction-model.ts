import * as jmespath from "jmespath"

import { ExtractionModel } from "../interfaces/extraction-model"

export type JsonExtractionModelShapeValue = {
    query: string
    default?: any
    model?: ExtractionModel
    multiple?: boolean
    limit?: number
}

export type JsonExtractionModelShape = {
    [key: string]: JsonExtractionModelShapeValue
}

export type InferJsonValue<V extends JsonExtractionModelShapeValue> =
    V["model"] extends ExtractionModel<infer M> ? (V["multiple"] extends true ? M[] : M) : any

export type InferJsonShape<S extends JsonExtractionModelShape> = {
    [K in keyof S]: InferJsonValue<S[K]>
}

export class JsonExtractionModel<S extends JsonExtractionModelShape> implements ExtractionModel<InferJsonShape<S>> {
    constructor(readonly shape: S) {}

    async extract(source: string): Promise<InferJsonShape<S>> {
        const root = JSON.parse(source)
        const data: any = {}

        for (const key in this.shape) {
            const value = this.shape[key]

            const isNestedValue = "model" in value

            if (isNestedValue) {
                data[key] = await this.extractNestedValue(value, root)
            } else {
                data[key] = this.extractValue(value, root)
            }
        }

        return data
    }

    extractValue(value: JsonExtractionModelShapeValue, root: any) {
        const extractedData = jmespath.search(root, value.query)

        if (extractedData === null && value.default !== undefined) {
            return value.default
        }

        return extractedData
    }

    async extractNestedValue(value: JsonExtractionModelShapeValue, root: any) {
        const extractedData = jmespath.search(root, value.query)
        const model = value.model!

        if (extractedData === null && value.default !== undefined) {
            return value.default
        }

        if (value.multiple) {
            if (!Array.isArray(extractedData)) {
                throw new Error(`Expected an array for multiple values, but got ${typeof extractedData}`)
            }

            const items = value.limit !== undefined ? extractedData.slice(0, value.limit) : extractedData

            return await Promise.all(items.map((item) => model.extract(this.toModelSource(model, item))))
        }

        return await model.extract(this.toModelSource(model, extractedData))
    }

    /**
     * JSON models receive the value serialized as JSON. Other models (HTML, Markdown, …) receive
     * the value itself, which must be a string such as an HTML snippet stored in the JSON.
     */
    protected toModelSource(model: ExtractionModel, value: unknown): string {
        const isJsonModel = model instanceof JsonExtractionModel || model.constructor.name === JsonExtractionModel.name

        if (isJsonModel) {
            return JSON.stringify(value)
        }

        if (typeof value !== "string") {
            throw new Error(`Expected a string for model parsing, but got ${typeof value}`)
        }

        return value
    }
}
