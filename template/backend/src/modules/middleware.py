import os, logging
from dotenv import load_dotenv
from flask import (
  request,
  abort,
  Response,
  g
)

def register_middlewares(app):
  @app.before_request
  def log_incoming(response: Response):
    pass
  
  @app.after_request
  def set_tokens(response: Response):
    pass

  @app.before_request
  def auth_guard():
    pass
    