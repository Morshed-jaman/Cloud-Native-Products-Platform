{{/*
Expand the name of the chart.
*/}}
{{- define "products.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "products.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Resolve the target namespace.
*/}}
{{- define "products.namespace" -}}
{{- default .Release.Namespace .Values.namespace.name -}}
{{- end -}}

{{/*
Standard Helm labels.
*/}}
{{- define "products.labels" -}}
helm.sh/chart: {{ include "products.chart" . }}
app.kubernetes.io/name: {{ include "products.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{/*
Component labels include the legacy app label used by the original manifests.
*/}}
{{- define "products.componentLabels" -}}
{{ include "products.labels" .root }}
app.kubernetes.io/component: {{ .component }}
app: {{ .component }}
{{- end -}}

{{/*
Selector labels stay stable across chart upgrades.
*/}}
{{- define "products.selectorLabels" -}}
app.kubernetes.io/name: {{ include "products.name" .root }}
app.kubernetes.io/instance: {{ .root.Release.Name }}
app.kubernetes.io/component: {{ .component }}
app: {{ .component }}
{{- end -}}

{{/*
Build a container image reference from registry/repository/tag values.
*/}}
{{- define "products.image" -}}
{{- if .image.registry -}}
{{- printf "%s/%s:%s" .image.registry .image.repository .image.tag -}}
{{- else -}}
{{- printf "%s:%s" .image.repository .image.tag -}}
{{- end -}}
{{- end -}}

{{- define "products.configName" -}}
{{- printf "%s-config" .Release.Name -}}
{{- end -}}

{{- define "products.secretName" -}}
{{- printf "%s-secrets" .Release.Name -}}
{{- end -}}

{{- define "products.postgresPvcName" -}}
{{- default (printf "%s-data" .Values.postgres.name) .Values.postgres.persistence.existingClaim -}}
{{- end -}}
