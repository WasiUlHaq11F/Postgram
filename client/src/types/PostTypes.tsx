
export interface postTypes {
    id: number
    userId: number;
    title: string;
    body:string
    authorEmail:string
    likesCount: number
}

export interface commentTypes {
    postId: number;
    id: number;
    body:string,
    author: {
        email: string;
      };
    parentId: number | null;
    createdAt: string;
}
