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

// Simulating Chatwoot-like class with static methods
interface SearchContactResponse {
    meta: { count: number; current_page: number }
    payload: Array<{ id: number; name: string; phone: string }>
}

interface ContactConversationsResponse {
    payload: Array<{ id: number; status: string }>
}

export class Chatwoot {
    static searchContact(phone: string): Promise<SearchContactResponse> {
        return Promise.resolve({ meta: { count: 0, current_page: 1 }, payload: [] })
    }

    static getContactConversations(contactId: number): Promise<ContactConversationsResponse> {
        return Promise.resolve({ payload: [] })
    }

    static createContact(phone: string, name: string, email: string): void {
        // Implementation
    }

    static createConversation(contactId: number, phone: string): void {
        // Implementation
    }

    static findOrCreateContact(phone: string, name: string, email: string): void {
        // Implementation
    }

    static postPrivateResponse(conversationId: number, content: string): void {
        // Implementation
    }

    static getLabels(accountId: number, conversationId: number): void {
        // Implementation
    }

    static setLabels(accountId: number, conversationId: number, labels: string[]): void {
        // Implementation
    }
}

export class Whatsapp {
    static sendPaymentTemplate(phone: string, paymentLink: string, pixCode: string): void {
        // Implementation
    }

    static sendStatusUpdate(phone: string, referenceId: string, status: 'processing' | 'completed'): void {
        // Implementation
    }
}

// Regular function outside class
export function convertPhoneNumber(phoneNumber: string): string {
    return phoneNumber.replace(/\D/g, '')
}
