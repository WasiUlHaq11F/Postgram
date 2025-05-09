 export interface User {
    id: string
    email: string
    token: string
}


export interface UserContextType {

    user: User
    token:string

}