"""Read English text from stdin and produce a mono PCM WAV for the audio pipeline."""

import argparse
import sys
import wave

import numpy as np
import onnxruntime
from kokoro_onnx import Kokoro


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", required=True)
    parser.add_argument("--voices", required=True)
    parser.add_argument("--voice", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    text = sys.stdin.buffer.read().decode("utf-8").strip()
    if not text:
        parser.error("Expected nonempty UTF-8 text on stdin")

    accent = {"a": "en-us", "b": "en-gb"}[args.voice[0]]
    options = onnxruntime.SessionOptions()
    options.intra_op_num_threads = 2
    session = onnxruntime.InferenceSession(
        args.model, options, providers=["CPUExecutionProvider"]
    )
    engine = Kokoro.from_session(session, args.voices)
    samples, sample_rate = engine.create(text, args.voice, lang=accent)
    if samples.size == 0 or not np.isfinite(samples).all() or not np.any(samples):
        raise ValueError("Kokoro returned invalid or silent audio")

    pcm = (np.clip(samples, -1, 1) * 32767).astype("<i2")
    with wave.open(args.output, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        wav.writeframes(pcm.tobytes())


if __name__ == "__main__":
    main()
