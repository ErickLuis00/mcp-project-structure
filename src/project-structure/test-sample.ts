/**
 * A utility file with sample functions for testing the parser
 */

// Function declaration
export function isPointNearLine(point: { x: number; y: number }, line: any, threshold: number = 5): boolean {
    return true // Dummy implementation
}

// Arrow function assigned to a variable
export const distancePointToLineSegment = (
    point: { x: number; y: number },
    lineStart: { x: number; y: number },
    lineEnd: { x: number; y: number }
): number => {
    return 0 // Dummy implementation
}

// Interface for type checking
interface Element {
    id: string
    zIndex: number
}

// Function declaration with array type
export function getHighestZIndex(elements: Element[]): number {
    return 0 // Dummy implementation
}

// Function with optional parameter and union return type
export function getElementById(elements: Element[], id: string): Element | undefined {
    return elements.find(el => el.id === id)
}

// Function expression
export const sortElementsByZIndex = function (elements: Element[]): Element[] {
    return [...elements].sort((a, b) => a.zIndex - b.zIndex)
}

// Method in a class
class ElementManager {
    elements: Element[] = []

    addElement(element: Element): void {
        this.elements.push(element)
    }

    findElementById(id: string): Element | undefined {
        return this.elements.find(el => el.id === id)
    }
}
