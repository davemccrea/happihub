defmodule AstrupWeb.Components.EcgPlayer do
  use AstrupWeb, :live_component

  def render(assigns) do
    ~H"""
    <div class="space-y-12">
      <div class="space-y-4">
        <%= if @ecg_loaded do %>
          <div class="flex justify-end">
            <div class="text-sm text-base-content/60 flex items-center gap-2">
              <span>Use</span>
              <kbd class="kbd kbd-sm">↑</kbd>
              <kbd class="kbd kbd-sm">↓</kbd>
              <span>or</span>
              <kbd class="kbd kbd-sm">k</kbd>
              <kbd class="kbd kbd-sm">j</kbd>
              <span>to switch leads,</span>
              <kbd class="kbd kbd-sm">Space</kbd>
              <span>to play/pause</span>
            </div>
          </div>
        <% end %>

        <div class="relative py-8">
          <div
            id="ecg-playback"
            phx-hook="ECGPlayback"
            phx-update="ignore"
            phx-target={@myself}
            class="w-full"
            data-env={@env}
            data-initial-lead="1"
            data-initial-display-mode="single"
            data-initial-grid-type="simple"
          >
            <div data-ecg-chart class="w-full"></div>
          </div>

          <%= if not @ecg_loaded do %>
            <div class="absolute inset-0 flex items-center justify-center bg-base-100/90">
              <div class="text-center space-y-4">
                <div class="text-6xl opacity-30">
                  <.icon name="hero-heart" class="w-16 h-16 mx-auto" />
                </div>
                <div class="space-y-2">
                  <p class="text-lg font-medium">No ECG Data Loaded</p>
                  <p class="text-sm text-base-content/60">Click "Load Random ECG" to begin</p>
                </div>
              </div>
            </div>
          <% end %>
        </div>
      </div>

      <%= if @ecg_loaded do %>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <%= if @database_record do %>
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

                    <%= if @translated_report do %>
                      <div class="collapse collapse-arrow bg-base-100">
                        <input type="checkbox" checked="checked" />
                        <div class="collapse-title text-sm font-medium flex items-center gap-2">
                          <.icon name="hero-language" class="w-4 h-4 text-success" />
                          English Translation
                        </div>
                        <div class="collapse-content">
                          <div class="prose prose-sm max-w-none">
                            <p class="leading-relaxed">{String.capitalize(@translated_report)}</p>
                          </div>
                        </div>
                      </div>

                      <div class="collapse collapse-arrow bg-base-100">
                        <input type="checkbox" />
                        <div class="collapse-title text-sm font-medium flex items-center gap-2">
                          <.icon name="hero-globe-alt" class="w-4 h-4 text-neutral" /> Original Report
                        </div>
                        <div class="collapse-content">
                          <div class="prose prose-sm max-w-none">
                            <p class="italic leading-relaxed text-base-content/80">
                              {String.capitalize(Map.get(@metadata, :report, ""))}
                            </p>
                          </div>
                        </div>
                      </div>
                    <% else %>
                      <div class="bg-base-100 rounded-lg p-4 border border-base-300">
                        <div class="prose prose-sm max-w-none">
                          <p class="leading-relaxed m-0">
                            {String.capitalize(Map.get(@metadata, :report, ""))}
                          </p>
                        </div>
                      </div>
                    <% end %>
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
              </div>
            </div>
          <% end %>

          <div class={if @database_record, do: "", else: "lg:col-span-2"}>
            <div class="space-y-6">
              <div class="card bg-base-200 shadow">
                <div class="card-body">
                  <h2 class="card-title">
                    <.icon name="hero-adjustments-horizontal" class="w-5 h-5" /> ECG Controls
                  </h2>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <.input
                        type="select"
                        id="display-mode-selector"
                        label="Display Mode"
                        name="display-mode"
                        value="single"
                        options={[{"Single Lead", "single"}, {"All Leads", "multi"}]}
                      />
                    </div>

                    <div id="lead-selector-container">
                      <.input
                        type="select"
                        id="lead-selector"
                        label="Current Lead"
                        name="lead"
                        value={1}
                        options={
                          for {name, index} <- Enum.with_index(@lead_names) do
                            {"Lead #{name}", index}
                          end
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div class="card bg-base-200 shadow">
                <div class="card-body">
                  <h2 class="card-title">
                    <.icon name="hero-cog-6-tooth" class="w-5 h-5" /> View Options
                  </h2>
                  <div class="space-y-6">
                    <div>
                      <.input
                        type="select"
                        id="grid-type-selector"
                        label="Grid Type"
                        name="grid-type"
                        value="simple"
                        options={[{"Medical Grid", "medical"}, {"Simple Grid", "simple"}]}
                      />
                    </div>

                    <div class="space-y-4 w-1/2">
                      <h3 class="text-sm font-medium text-base-content/70">Scale Adjustments</h3>

                      <div class="space-y-3">
                        <div class="flex flex-col space-y-2">
                          <div class="flex justify-between items-center">
                            <span class="text-sm font-medium">Grid Scale</span>
                            <div class="flex items-center gap-2">
                              <span id="grid-scale-value" class="text-xs text-base-content/70">
                                1.00x
                              </span>
                              <span id="grid-scale-speed" class="text-xs text-base-content/50">
                                25.0 mm/s
                              </span>
                            </div>
                          </div>
                          <input
                            type="range"
                            id="grid-scale-slider"
                            name="grid-scale"
                            min="0.75"
                            max="1.25"
                            step="0.01"
                            value="1.0"
                            class="range range-xs w-full"
                          />
                        </div>

                        <div class="flex flex-col space-y-2">
                          <div class="flex justify-between items-center">
                            <span class="text-sm font-medium">Amplitude Scale</span>
                            <div class="flex items-center gap-2">
                              <span id="amplitude-scale-value" class="text-xs text-base-content/70">
                                1.00x
                              </span>
                              <span id="amplitude-scale-gain" class="text-xs text-base-content/50">
                                10.0 mm/mV
                              </span>
                            </div>
                          </div>
                          <input
                            type="range"
                            id="amplitude-scale-slider"
                            name="amplitude-scale"
                            min="0.75"
                            max="1.25"
                            step="0.01"
                            value="1.0"
                            class="range range-xs w-full"
                          />
                        </div>

                        <div class="flex flex-col space-y-2">
                          <div class="flex justify-between items-center">
                            <span class="text-sm font-medium">Height Scale</span>
                            <div class="flex items-center gap-2">
                              <span id="height-scale-value" class="text-xs text-base-content/70">
                                1.20x
                              </span>
                              <span id="height-scale-pixels" class="text-xs text-base-content/50">
                                180px
                              </span>
                            </div>
                          </div>
                          <input
                            type="range"
                            id="height-scale-slider"
                            name="height-scale"
                            min="0.95"
                            max="1.45"
                            step="0.01"
                            value="1.2"
                            class="range range-xs w-full"
                          />
                        </div>
                      </div>
                    </div>

                    <div class="space-y-3">
                      <h3 class="text-sm font-medium text-base-content/70">Playback Options</h3>

                      <div class="space-y-2">
                        <.input
                          type="checkbox"
                          id="loop-checkbox"
                          label="Loop playback"
                          name="loop"
                          value="true"
                          checked={true}
                        />

                        <.input
                          type="checkbox"
                          id="qrs-indicator-checkbox"
                          label="QRS pulse indicator"
                          name="qrs-indicator"
                          value="true"
                          checked={true}
                        />

                        <.input
                          type="checkbox"
                          id="debug-checkbox"
                          label="Show diagnostics"
                          name="debug"
                          value="false"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      <% end %>
    </div>
    """
  end

  def handle_event("playback_changed", _params, socket), do: {:noreply, socket}
  def handle_event("lead_changed", _params, socket), do: {:noreply, socket}
  def handle_event("playback_ended", _params, socket), do: {:noreply, socket}
end
