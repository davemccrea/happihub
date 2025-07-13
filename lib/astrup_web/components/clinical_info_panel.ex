defmodule AstrupWeb.Components.ClinicalInfoPanel do
  use AstrupWeb, :html

  attr :metadata, :map, required: true

  def clinical_info_panel(assigns) do
    ~H"""
    <div class="card bg-base-200 shadow">
      <div class="card-body space-y-3">
        <h2 class="card-title">
          <.icon name="hero-document-text" class="w-5 h-5" /> Clinical Information
        </h2>

        <%= if Map.get(@metadata, :report) && Map.get(@metadata, :report) != "" do %>
          <div class="space-y-3">
            <h3 class="font-semibold">
              Medical Report
            </h3>

            <div class="bg-base-100 rounded-lg p-4 border border-base-300">
              <div class="prose prose-sm max-w-none">
                <p class="leading-relaxed m-0">
                  {String.capitalize(Map.get(@metadata, :report, ""))}
                </p>
              </div>
            </div>
          </div>
        <% end %>

        <%= if length(Map.get(@metadata, :scp_codes, [])) > 0 do %>
          <div class="space-y-3">
            <h3 class="font-semibold mb-3">
              Clinical Findings
            </h3>
            <div class="overflow-x-auto">
              <table class="table table-sm">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th class="text-right">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  <%= for scp <- Map.get(@metadata, :scp_codes, []) do %>
                    <tr class="hover">
                      <td>
                        <span class="badge badge-outline font-mono text-xs">
                          {scp.code}
                        </span>
                      </td>
                      <td>
                        <%= case scp.kind do %>
                          <% :diagnostic -> %>
                            <span class="badge badge-error badge-sm">Diagnosis</span>
                          <% :form -> %>
                            <span class="badge badge-warning badge-sm">Waveform</span>
                          <% :rhythm -> %>
                            <span class="badge badge-success badge-sm">Rhythm</span>
                          <% _ -> %>
                            <span class="badge badge-neutral badge-sm">Other</span>
                        <% end %>
                      </td>
                      <td class="max-w-xs">
                        <span class="text-sm leading-relaxed">
                          {String.capitalize(scp.description)}
                        </span>
                      </td>
                      <td class="text-right">
                        <%= if scp.kind == :diagnostic do %>
                          <span class="font-medium">
                            {trunc(scp.confidence)}%
                          </span>
                        <% else %>
                          <.icon name="hero-check" class="w-4 h-4 text-success" />
                        <% end %>
                      </td>
                    </tr>
                  <% end %>
                </tbody>
              </table>
            </div>
          </div>
        <% end %>

        <%= if Map.get(@metadata, :report) == nil and length(Map.get(@metadata, :scp_codes, [])) == 0 do %>
          <div class="text-sm text-base-content/60">
            No clinical information available for this ECG.
          </div>
        <% end %>
      </div>
    </div>
    """
  end
end
