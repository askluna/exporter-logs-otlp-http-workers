import { diag } from '@opentelemetry/api';
import { getEnv } from '@opentelemetry/core';
import { type OTLPExporterConfigBase } from '@opentelemetry/otlp-exporter-base';
import { appendResourcePathToUrl, appendRootPathToUrlIfNeeded } from '@opentelemetry/otlp-exporter-base';

const DEFAULT_COLLECTOR_RESOURCE_PATH = 'v1/logs';
/**
 * common get default url
 * @param config exporter config
 * @returns url string
 */

export function getDefaultUrl(config: OTLPExporterConfigBase): string {
	const url =
		typeof config.url === 'string'
			? config.url
			: getEnv().OTEL_EXPORTER_OTLP_LOGS_ENDPOINT.length > 0
				? appendRootPathToUrlIfNeeded(getEnv().OTEL_EXPORTER_OTLP_LOGS_ENDPOINT)
				: getEnv().OTEL_EXPORTER_OTLP_ENDPOINT.length > 0
					? appendResourcePathToUrl(getEnv().OTEL_EXPORTER_OTLP_ENDPOINT, DEFAULT_COLLECTOR_RESOURCE_PATH)
					: null;

	if (!url) {
		diag.error('Failed to get default url');
		return '';
	}

	return url;
}
