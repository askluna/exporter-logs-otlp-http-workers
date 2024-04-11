/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { diag } from '@opentelemetry/api';
import { getEnv, baggageUtils } from '@opentelemetry/core';
import { type CompressionAlgorithm, type OTLPExporterNodeConfigBase } from '@opentelemetry/otlp-exporter-base';
import { OTLPExporterBase, OTLPExporterError, parseHeaders } from '@opentelemetry/otlp-exporter-base';
import { type IExportLogsServiceRequest } from '@opentelemetry/otlp-transformer';
import { createExportLogsServiceRequest } from '@opentelemetry/otlp-transformer';
import { type ReadableLogRecord, type LogRecordExporter } from '@opentelemetry/sdk-logs';

import { getDefaultUrl } from '~~/getDefaultUrl';

const DEFAULT_USER_AGENT = {
	'User-Agent': `OTel-OTLP-Exporter-JavaScript-Http-workers`,
};

export interface OTLPLogExporterConfigworkers extends OTLPExporterNodeConfigBase {
	fetchHandler: typeof fetch;
	errorsToConsole?: boolean;
}

/**
 * Collector Metric Exporter abstract base class
 */
export class OTLPLogExporterWorkers
	extends OTLPExporterBase<OTLPLogExporterConfigworkers, ReadableLogRecord, IExportLogsServiceRequest>
	implements LogRecordExporter
{
	DEFAULT_HEADERS: Record<string, string> = {};
	headers: Record<string, string>;
	compression: CompressionAlgorithm;
	fetchHandler: typeof fetch;
	errorsToConsole: boolean;

	constructor(config: OTLPLogExporterConfigworkers) {
		super({
			timeoutMillis: getEnv().OTEL_EXPORTER_OTLP_LOGS_TIMEOUT,
			...config,
		});

		this.fetchHandler = config.fetchHandler;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
		if ((config as any).metadata) {
			diag.warn('Metadata cannot be set when using http');
		}

		const baseHeaders = Object.assign(
			this.DEFAULT_HEADERS,
			parseHeaders(config.headers),
			baggageUtils.parseKeyPairsIntoRecord(getEnv().OTEL_EXPORTER_OTLP_HEADERS)
		);

		this.compression = config.compression ?? ('gzip' as never);
		this.errorsToConsole = config.errorsToConsole ?? true;

		this.headers = {
			...this.headers,
			...baseHeaders,
			...DEFAULT_USER_AGENT,
			...baggageUtils.parseKeyPairsIntoRecord(getEnv().OTEL_EXPORTER_OTLP_LOGS_HEADERS),
			...config.headers,
		};
	}

	onInit(_config: OTLPExporterNodeConfigBase): void {}

	async send(
		objects: ReadableLogRecord[],
		onSuccess: () => void,
		onError: (error: OTLPExporterError) => void
	): Promise<void> {
		if (this._shutdownOnce.isCalled) {
			diag.debug('Shutdown already started. Cannot send objects');
			return;
		}
		const serviceRequest = this.convert(objects);
		const headers = {
			'Content-Type': 'application/json',
			...this.headers,
		};

		let sendPromise: Promise<Response> | null;

		try {
			sendPromise = this.fetchHandler(this.url, {
				method: 'POST',
				body: JSON.stringify(serviceRequest),
				headers: headers,
			});
			this._sendingPromises.push(sendPromise);
			const response = await sendPromise;

			if (response.ok) {
				onSuccess();
			} else {
				throw new OTLPExporterError(`HTTP Error: ${response.statusText}`, response.status);
			}
		} catch (cause) {
			if (this.errorsToConsole) console.log('Could not send OTLP logs', cause);
			onError(cause as OTLPExporterError);
		}

		const index = this._sendingPromises.findIndex((promise) => promise === sendPromise);
		if (index > -1) {
			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			this._sendingPromises.splice(index, 1);
		}
		sendPromise = null;
	}

	onShutdown(): void {}

	convert(logRecords: ReadableLogRecord[]): IExportLogsServiceRequest {
		return createExportLogsServiceRequest(logRecords, {
			useHex: true,
			useLongBits: false,
		});
	}

	getDefaultUrl(config: OTLPExporterNodeConfigBase): string {
		return getDefaultUrl(config);
	}
}
