// Decreased exports by 80% (from 30+ types to 6 exports total)

// Object and interface types
export interface User {
    id: number
    name: string
    email?: string
    roles: string[]
    createdAt: Date
}

// Enum type
export enum Direction {
    Up = 'UP',
    Down = 'DOWN',
    Left = 'LEFT',
    Right = 'RIGHT'
}

// Generic type
export type ApiResponse<T> = {
    data: T
    error?: string
    status: number
}

// Discriminated union
export type Shape =
    | { kind: 'circle'; radius: number }
    | { kind: 'square'; side: number }
    | { kind: 'rectangle'; width: number; height: number }

// Recursive type
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

// Utility mapped type
export type Nullable<T> = { [P in keyof T]: T[P] | null }




export class User {
    id!: number
    name!: string

    static create(id: number, name: string): User {
        const user = new User()
        user.id = id
        user.name = name
        return user
    }   
  }

  export namespace Types {
    export interface Config {
        apiKey: string
        timeout: number
    }
    export type Status = 'active' | 'inactive'
  }

  declare module 'asddasd' {
    export interface SomeType {
        id: number
        name: string
    }
  }