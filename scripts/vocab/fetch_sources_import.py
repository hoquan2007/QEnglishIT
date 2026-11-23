"""Import the CLI helper without renaming the public fetch-sources.py entry point."""
import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location('vocab_fetch_sources', Path(__file__).with_name('fetch-sources.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
CACHE, ROOT = module.CACHE, module.ROOT
digest, write_json, atomic = module.digest, module.write_json, module.atomic
