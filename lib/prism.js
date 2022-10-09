import { createInstance } from '@stoplight/prism-http';
import { getHttpOperationsFromSpec } from '@stoplight/prism-cli/dist/operations.js';
import { createLogger } from '@stoplight/prism-core';
import { is } from 'type-is';
import pkg from 'micri';
import fs from 'fs';
import parsePreferHeader from 'parse-prefer-header';
import config from '../config.js';

const { json, text } = pkg;

let prismInstance = {};

function searchParamsToNameValues(searchParams) {
  const params = {};
  for (const key of searchParams.keys()) {
    const values = searchParams.getAll(key);
    params[key] = values.length === 1 ? values[0] : values;
  }
  return params;
}

function parseRequestOptions(req) {
  const preferences =
    req.headers && req.headers['prefer']
      ? parsePreferHeader(req.headers['prefer'])
      : { code: req.url.query?.__code, dynamic: req.url.query?.__dynamic, example: req.url.query?.__example };
  return preferences;
}

async function parseRequestBody(request) {
  // if no body provided then return null instead of empty string
  if (
    // If the body size is null, it means the body itself is null so the promise can resolve with a null value
    request.headers['content-length'] === '0' ||
    request.headers['content-length'] === undefined ||
    (request.headers['content-type'] === undefined &&
      request.headers['transfer-encoding'] === undefined &&
      request.headers['content-length'] === undefined)
  ) {
    return Promise.resolve(null);
  }

  if (is(request, ['application/json', 'application/*+json'])) {
    return json(request, { limit: '10mb' });
  } else {
    return text(request, { limit: '10mb' });
  }
}

async function parseInput(request) {
  const { url, method, headers } = request;
  const { searchParams, pathname } = new URL(
    url, // url can't be empty for HTTP request
    'http://example.com', // needed because URL can't handle relative URLs
  );
  const body = await parseRequestBody(request);
  const input = {
    method: method ? method.toLowerCase() : 'get',
    url: {
      path: pathname,
      baseUrl: searchParams.get('__server') || undefined,
      query: searchParamsToNameValues(searchParams),
    },
    headers,
    body,
  };
  return input;
}

async function createPrismInstance(instanceId, spec) {
  if (prismInstance[instanceId]) {
    return prismInstance[instanceId];
  }
  const components = {
    logger: createLogger('TestLogger'),
  };
  const prismConfig = {
    checkSecurity: false,
    validateRequest: false,
    validateResponse: false,
    mock: false,
    errors: false,
  };
  saveSpecByInstanceid(instanceId, spec);
  const prism = createInstance(prismConfig, components);
  const operations = await getHttpOperationsFromSpec(spec);

  const prismContainer = {
    request: async (req) => {
      const input = await parseInput(req);
      const reqConfig = parseRequestOptions(req);
      const updatedConfig = { ...prismConfig, mock: { ...prismConfig.mock, ...reqConfig } };
      return await prism.request(input, operations, updatedConfig)();
    },
  };
  prismInstance[instanceId] = prismContainer;
  return prismInstance[instanceId];
}

function findSpecByInstanceid(instanceId) {
  const content = fs.readFileSync(`${config.specdir}/${instanceId}.json`);
  return JSON.parse(content);
}

async function saveSpecByInstanceid(instanceId, spec) {
  const content = JSON.stringify(spec);
  fs.writeFileSync(`${config.specdir}/${instanceId}.json`, content);
}

function hasPrismInstance(instanceId) {
  return Object.keys(prismInstance).includes(instanceId);
}

async function getCurrentPrismInstance(instanceId) {
  if (hasPrismInstance(instanceId)) {
    return prismInstance[instanceId];
  }

  let spec;
  try {
    spec = findSpecByInstanceid(instanceId);
  } catch (error) {
    return false;
  }
  if (!spec) {
    throw new Error("spec not found!");
  }
  return await createPrismInstance(instanceId, spec);
}

function deleteCurrentPrismInstance(instanceId) {
  delete prismInstance[instanceId];
  return !hasPrismInstance(instanceId);
}

export {
  createPrismInstance,
  getCurrentPrismInstance,
  deleteCurrentPrismInstance,
};

export default createPrismInstance;
