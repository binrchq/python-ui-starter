declare module "qwebchannel" {
  export class QWebChannel {
    constructor(transport: unknown, callback?: (channel: QWebChannel) => void);
    objects: Record<string, unknown>;
  }
}