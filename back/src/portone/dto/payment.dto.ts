export interface PaymentCompleteDto {
  imp_uid: string;
  merchant_uid: string;
  email: string;
  request_amount: number;
  name: string;
}

export interface PaymentCancel {
  email: string;
  merchant_uid: string;
}
