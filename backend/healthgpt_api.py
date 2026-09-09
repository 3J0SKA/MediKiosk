from fastapi import FastAPI, Request
from transformers import AutoTokenizer, AutoModelForCausalLM

app = FastAPI()

# Load HealthGPT model (use a smaller one for 8GB GPU)
tokenizer = AutoTokenizer.from_pretrained("mradermacher/HealthGPT-Pro-4B-GGUF")
model = AutoModelForCausalLM.from_pretrained("mradermacher/HealthGPT-Pro-4B-GGUF")

@app.post("/healthgpt")
async def healthgpt(request: Request):
    data = await request.json()
    text = data.get("input", "")
    inputs = tokenizer(text, return_tensors="pt")
    outputs = model.generate(inputs["input_ids"], max_new_tokens=200)
    response = tokenizer.decode(outputs[0], skip_special_tokens=True)
    return {"output": response}
