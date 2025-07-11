defmodule Astrup.ClaudeAPI do
  @api_url "https://api.anthropic.com/v1/messages"
  @model "claude-sonnet-4-20250514"

  def send_prompt(prompt) do
    headers = [
      {"Content-Type", "application/json"},
      {"x-api-key", get_api_key()},
      {"anthropic-version", "2023-06-01"}
    ]

    body = %{
      model: @model,
      max_tokens: 1024,
      temperature: 0.8,
      messages: [
        %{
          role: "user",
          content: prompt
        }
      ]
    }

    case Req.post(@api_url, json: body, headers: headers) do
      {:ok, %{status: 200, body: response}} ->
        extract_text_content(response)

      {:ok, %{status: status, body: body}} ->
        {:error, "API request failed with status #{status}: #{inspect(body)}"}

      {:error, reason} ->
        {:error, "Request failed: #{inspect(reason)}"}
    end
  end


  defp extract_text_content(response) do
    case response do
      %{"content" => [%{"text" => text_content}]} ->
        {:ok, text_content}

      _ ->
        {:error, "Unexpected response format: #{inspect(response)}"}
    end
  end

  defp get_api_key, do: Application.get_env(:astrup, :claude_api_key)
end
