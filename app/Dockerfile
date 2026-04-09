FROM python:3.12-slim

WORKDIR /app

COPY src/ .

RUN pip install flask

EXPOSE 8080

CMD ["python", "main.py"]