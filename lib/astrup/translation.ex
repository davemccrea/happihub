defmodule Astrup.Translation do
  @moduledoc """
  Text translation utilities for medical content.
  """

  alias Astrup.ClaudeAPI

  @doc """
  Translates medical text to the target language using Claude API.

  Preserves medical terminology and maintains clinical accuracy.

  ## Examples

      iex> Translation.translate_medical_text("Sinusrhythmus", "English")
      {:ok, "Sinus rhythm"}
      
      iex> Translation.translate_medical_text("", "English")
      {:ok, ""}
  """
  @spec translate_medical_text(String.t(), String.t()) :: {:ok, String.t()} | {:error, String.t()}
  def translate_medical_text(text, target_language \\ "English")
  def translate_medical_text("", _target_language), do: {:ok, ""}

  def translate_medical_text(text, target_language) when is_binary(text) do
    prompt = """
    Please translate the following medical text to #{target_language}. 
    Preserve all medical terminology and maintain the clinical accuracy.
    Only return the translated text, no additional commentary.

    Text to translate:
    #{text}
    """

    case ClaudeAPI.send_prompt(prompt) do
      {:ok, translated_text} ->
        {:ok, String.trim(translated_text)}

      {:error, reason} ->
        {:error, reason}
    end
  end
end
