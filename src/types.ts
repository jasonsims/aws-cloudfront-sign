export interface SignatureOptions {
  keypairId: string;
  expireTime?: number;
  ipRange?: string;
  privateKeyString?: string;
  privateKeyPath?: string
}

export interface PolicyCondition {
  DateLessThan: {
    'AWS:EpochTime': number
  },
  IpAddress?: {
    'AWS:SourceIp': string
  }
}

export interface PolicyStatement {
  Resource: string;
  Condition: PolicyCondition;
}

export interface AwsPolicy {
  Statement: PolicyStatement[]
}
