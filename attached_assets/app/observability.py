import logging, sys, json, os
from pythonjsonlogger import jsonlogger
from sentry_sdk.integrations.fastapi import FastApiIntegration
import sentry_sdk
from opentelemetry import trace
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from .utils import ENV, RELEASE
def init_logging():
    handler = logging.StreamHandler(sys.stdout)
    formatter = jsonlogger.JsonFormatter("%(asctime)s %(levelname)s %(message)s")
    handler.setFormatter(formatter)
    root = logging.getLogger()
    root.handlers.clear(); root.addHandler(handler); root.setLevel(logging.INFO)
def init_sentry():
    dsn = os.getenv("SENTRY_DSN")
    if dsn:
        sentry_sdk.init(dsn=dsn, integrations=[FastApiIntegration()], traces_sample_rate=float(os.getenv("SENTRY_TRACES_RATE","0.2")), environment=ENV, release=RELEASE)
def init_tracing():
    endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
    resource = Resource.create({"service.name": "doorsurvey-api", "service.version": RELEASE, "env": ENV})
    provider = TracerProvider(resource=resource)
    if endpoint:
        exporter = OTLPSpanExporter(endpoint=endpoint)
        provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)
def log(event, **kw):
    logging.getLogger().info(json.dumps({"event": event, **kw}))
