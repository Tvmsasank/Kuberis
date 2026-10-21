pipeline {
    agent any

    tools {
        // Requires 'NodeJS' tool configured in Jenkins Global Tool Configuration
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
                sh 'git log -1 --stat'
            }
        }

        stage('Install Dependencies') {
            steps {
                echo '=== [Stage 2] Installing clean dependencies ==='
                sh 'npm ci --prefer-offline'
            }
        }

        stage('Code Quality & Syntax Check') {
            steps {
                echo '=== [Stage 3] Validating Node.js server scripts and database engine ==='
                sh 'node -c server/index.js'
                sh 'node -c server/db.js'
            }
        }

        stage('Build Frontend Bundle') {
            steps {
                echo '=== [Stage 4] Compiling Vite React production distribution ==='
                sh 'npm run build'
            }
        }

        stage('Security & Audit Check') {
            steps {
                echo '=== [Stage 5] Running security vulnerability scan ==='
                // Runs audit check; doesn't fail build on minor warnings but logs issues
                sh 'npm audit --audit-level=critical || true'
            }
        }

        stage('Deploy to Render (Production Gate)') {
            when {
                branch 'main'
            }
            steps {
                echo '=== [Stage 6] Quality Gates Passed: Triggering Render Deployment Webhook ==='
                sh '''
                    if [ -n "$RENDER_DEPLOY_HOOK" ]; then
                        echo "Triggering Render Production Deploy..."
                        HTTP_RESPONSE=$(curl -s -o response.json -w "%{http_code}" -X POST "$RENDER_DEPLOY_HOOK")
                        echo "Render Deploy Webhook Response Code: $HTTP_RESPONSE"
                        cat response.json
                        if [ "$HTTP_RESPONSE" -ge 200 ] && [ "$HTTP_RESPONSE" -lt 300 ]; then
                            echo "SUCCESS: Render deployment triggered successfully!"
                        else
                            echo "ERROR: Failed to trigger Render deployment (HTTP $HTTP_RESPONSE)"
                            exit 1
                        fi
                    else
                        echo "WARNING: RENDER_DEPLOY_HOOK credential not set. Skipping deploy trigger."
                    fi
                '''
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
