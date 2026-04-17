import { Params } from 'nestjs-pino';

const isDev = process.env.NODE_ENV !== 'production';

export const pinoConfig: Params = {
  pinoHttp: {
    level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
    transport: isDev
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            singleLine: false,
            translateTime: 'SYS:HH:MM:ss.l',
            ignore: 'pid,hostname',
            messageFormat: '{msg}',
          },
        }
      : undefined,
    ...(isDev ? {} : { formatters: { level: (label: string) => ({ level: label }) } }),
    autoLogging: false,
    quietReqLogger: true,
    customProps: () => ({ context: 'HTTP' }),
  },
};
