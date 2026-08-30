import os
import sys
import torch
import warnings
import soundfile as sf
from dotenv import load_dotenv

# 1. Suppress non-critical warnings in terminal
warnings.filterwarnings("ignore")
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

# 2. Load environment variables from .env
load_dotenv()

token = os.getenv("HF_TOKEN")
if not token or token == "your_huggingface_token_here":
    print("❌ Error: HF_TOKEN is not configured in your .env file.")
    sys.exit(1)

# 3. Detect device
device = "cuda:0" if torch.cuda.is_available() else "cpu"
print(f"➜ Running on device: {device}")

try:
    from parler_tts import ParlerTTSForConditionalGeneration
    from transformers import AutoTokenizer

    print("➜ Loading Indic Parler-TTS model & tokenizers...")
    model = ParlerTTSForConditionalGeneration.from_pretrained(
        "ai4bharat/indic-parler-tts", 
        token=token
    ).to(device)

    tokenizer = AutoTokenizer.from_pretrained("ai4bharat/indic-parler-tts", token=token)
    description_tokenizer = AutoTokenizer.from_pretrained(
        model.config.text_encoder._name_or_path, 
        token=token
    )

    # 4. Inputs for generation
    prompt = "मैं एक प्रोजेक्ट पर काम कर रहा हूँ।"
    description = "Divya speaks in a clear, expressive voice at a normal pace in a quiet environment with very clear audio quality."

    print(f"➜ Generating speech for text: '{prompt}'...")
    
    input_ids = description_tokenizer(description, return_tensors="pt").input_ids.to(device)
    prompt_input_ids = tokenizer(prompt, return_tensors="pt").input_ids.to(device)

    # 5. Generate audio waveform
    generation = model.generate(input_ids=input_ids, prompt_input_ids=prompt_input_ids)
    audio_arr = generation.cpu().numpy().squeeze()

    # 6. Save output file
    output_filename = "sonia_test.wav"
    sf.write(output_filename, audio_arr, model.config.sampling_rate)
    
    print(f"✅ SUCCESS! Generated audio saved to '{output_filename}'.")

except Exception as e:
    print(f"❌ Execution failed with error:\n{e}")