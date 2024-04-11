import { type Logger, type LoggerOptions } from '@opentelemetry/api-logs';
import { type LoggerProvider } from '@opentelemetry/sdk-logs';

export type CreateOtelLoggerParams = {
	name: string;
	version?: string;
	options?: LoggerOptions;
};

export const createOtelLogger = (loggerProvider: LoggerProvider, params: CreateOtelLoggerParams): Logger => {
	const loggerOtel = loggerProvider.getLogger(params.name, params.version ?? '1.0.0', params.options);

	return loggerOtel;
};
