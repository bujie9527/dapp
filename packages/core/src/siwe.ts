import { SiweMessage } from "siwe";

export type SiweVerifyParams = {
  message: string;
  signature: string;
};

export function createSiweMessage(params: {
  domain: string;
  address: string;
  statement?: string;
  nonce: string;
  chainId: number;
  uri: string;
}) {
  const msg = new SiweMessage({
    domain: params.domain,
    address: params.address,
    statement: params.statement ?? "Sign in to the dApp.",
    uri: params.uri,
    version: "1",
    chainId: params.chainId,
    nonce: params.nonce,
  });
  return msg;
}

export async function verifySiweMessage(params: SiweVerifyParams): Promise<SiweMessage> {
  const msg = new SiweMessage(params.message);
  await msg.verify({ signature: params.signature });
  return msg;
}
