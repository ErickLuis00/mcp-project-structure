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
    // Methods WITH explicit return types
    static searchContact(phone: string): Promise<SearchContactResponse> {
        return Promise.resolve({ meta: { count: 0, current_page: 1 }, payload: [] })
    }

    static getContactConversations(contactId: number): Promise<ContactConversationsResponse> {
        return Promise.resolve({ payload: [] })
    }

    // Sync method with explicit return type
    static createContact(phone: string, name: string, email: string): void {
        // Implementation
    }

    // Methods WITHOUT explicit return types (testing async inference)
    static async postPrivateResponseToChatwootAsAdmin(conversationId: number, content: string) {
        const response = await fetch(`/api/conversations/${conversationId}/messages`, {
            method: 'POST',
            body: JSON.stringify({ content })
        })
        return await response.json()
    }

    static async getLabelsFromConversationAsAdmin(accountId: number, conversationId: number) {
        const response = await fetch(`/api/accounts/${accountId}/conversations/${conversationId}/labels`)
        return await response.json()
    }

    static async setLabelsToConversationAsAdmin(accountId: number, conversationId: number, labels: string[]) {
        const response = await fetch(`/api/accounts/${accountId}/conversations/${conversationId}/labels`, {
            method: 'POST',
            body: JSON.stringify({ labels })
        })
        return await response.json()
    }

    // Sync method WITHOUT explicit return type (should show void)
    static logMessage(message: string) {
        console.log(message)
    }

    // Another sync method without return type
    static clearCache() {
        // Implementation - no return
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
