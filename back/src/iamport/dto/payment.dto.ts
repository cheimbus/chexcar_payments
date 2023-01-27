export interface PaymentCompleteDto {
    impUid: string;
    merchantUid: string;
    remains: number;
    type: number;
    device: string;
    email: string;
    amount: number;
    name: string;
}

export interface PaymentCancel {
    email: string;
    merchantUid: string;
}


export interface PaymentRemains {
    email: string;
    device: string;
}

export interface PaymentUpdateDto {
    email: string;
    device: string;
}

export interface PaymentValidationDto {
    email: string;
    device: string;
}