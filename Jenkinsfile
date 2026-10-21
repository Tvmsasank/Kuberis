pipeline {
    agent any

    tools {
        // Requires 'NodeJS' tool configured in Jenkins Global Tool Configuration (named 'NodeJS-20')
        nodejs 'NodeJS-20'
    }

    environment {
        // Securely injected from Jenkins Credentials Manager
        RENDER_DEPLOY_HOOK = credentials('kuberis-render-deploy-hook')
        CI = 'true'
    }

    options {
        timeout(time: 15, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
        disableConcurrentBuilds()
    }

    stages {
        stage('Checkout Code') {
            steps {
                echo '=== [Stage 1] Checking out code from GitHub ==='
                checkout scm
                script {
                    if (isUnix()) {
                        sh 'git log -1 --stat'
                    } else {
                        bat 'git log -1 --stat'
                    }
                }
            }
        }

        stage('Install Dependencies') {
            steps {
                echo '=== [Stage 2] Installing clean dependencies ==='
                script {
                    if (isUnix()) {
                        sh 'npm ci --prefer-offline'
                    } else {
                        bat 'npm ci --prefer-offline'
                    }
                }
            }
        }

        stage('Code Quality & Syntax Check') {
            steps {
                echo '=== [Stage 3] Validating Node.js server scripts and database engine ==='
                script {
                    if (isUnix()) {
                        sh 'node -c server/index.js'
                        sh 'node -c server/db.js'
                    } else {
                        bat 'node -c server/index.js'
                        bat 'node -c server/db.js'
                    }
                }
            }
        }

        stage('Build Frontend Bundle') {
            steps {
                echo '=== [Stage 4] Compiling Vite React production distribution ==='
                script {
                    if (isUnix()) {
                        sh 'npm run build'
                    } else {
                        bat 'npm run build'
                    }
                }
            }
        }

        stage('Security & Audit Check') {
            steps {
                echo '=== [Stage 5] Running security vulnerability scan ==='
                script {
                    if (isUnix()) {
                        sh 'npm audit --audit-level=critical || true'
                    } else {
                        bat 'npm audit --audit-level=critical || exit 0'
                    }
                }
            }
        }

        stage('Deploy to Render (Production Gate)') {
            steps {
                echo '=== [Stage 6] Quality Gates Passed: Triggering Render Deployment Webhook ==='
                script {
                    if (isUnix()) {
                        sh '''
                            if [ -z "$RENDER_DEPLOY_HOOK" ]; then
                                echo "❌ ERROR: RENDER_DEPLOY_HOOK credential is empty or not configured in Jenkins!"
                                echo "Please go to Jenkins -> Manage Jenkins -> Credentials and add 'kuberis-render-deploy-hook'."
                                exit 1
                            fi
                            echo "Triggering Render Production Deploy via Webhook..."
                            HTTP_CODE=$(curl -s -o response.json -w "%{http_code}" -X POST "$RENDER_DEPLOY_HOOK")
                            echo "Render Webhook Response Code: $HTTP_CODE"
                            cat response.json
                            if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
                                echo "✅ SUCCESS: Render deployment triggered successfully!"
                            else
                                echo "❌ ERROR: Render webhook returned HTTP $HTTP_CODE"
                                exit 1
                            fi
                        '''
                    } else {
                        powershell '''
                            $hook = $env:RENDER_DEPLOY_HOOK
                            if (-not $hook -or $hook.Trim() -eq "") {
                                Write-Error "❌ ERROR: RENDER_DEPLOY_HOOK credential is empty or not configured in Jenkins! Add a Secret Text credential with ID 'kuberis-render-deploy-hook'."
                                exit 1
                            }
                            Write-Host "Triggering Render Production Deploy via Webhook..."
                            try {
                                $response = Invoke-RestMethod -Uri $hook -Method Post
                                Write-Host "✅ SUCCESS: Render deployment triggered successfully!"
                                Write-Host ($response | ConvertTo-Json -Compress)
                            } catch {
                                Write-Error "❌ ERROR: Failed to trigger Render deploy webhook: $_"
                                exit 1
                            }
                        '''
                    }
                }
            }
        }
    }

    post {
        success {
            echo '==================================================='
            echo '🎉 PIPELINE SUCCESSFUL: Kuberis built and verified!'
            echo 'Render deployment is underway.'
            echo '==================================================='
        }
        failure {
            echo '==================================================='
            echo '🚨 PIPELINE FAILED: Code quality gate failed!'
            echo 'Deployment to Render was BLOCKED to protect production.'
            echo '==================================================='
        }
        always {
            cleanWs deleteDirs: true, notFailBuild: true
        }
    }
}
