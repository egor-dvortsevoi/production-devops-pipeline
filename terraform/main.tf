terraform{
    required_providers {
      kubernetes = {
        source = "hashicorp/kubernetes"
        version = "~> 2.0"
      }

      helm = {
        source = "hashicorp/helm"
        version = "~> 2.0"
      }
    }
}

# resource "kubernetes_deployment" "nginx" {
#   metadata {
#     name = "nginx-deployment"
#     labels = {
#       app = "nginx"
#     }
#   }

#   spec {
#     replicas = 1

#     selector {
#       match_labels = {
#         app = "nginx"
#       }
#     }

#     template {
#       metadata {
#         labels = {
#           app = "nginx"
#         }
#       }

#       spec {
#         container {
#           name  = "nginx"
#           image = "nginx:latest"

#           port {
#             container_port = 80
#           }
#         }
#       }
#     }
#   }
# }

# resource "kubernetes_service" "nginx" {
#   metadata {
#     name = "nginx-service"
#   }

#   spec {
#     selector = {
#       app = "nginx"
#     }

#     port {
#       port        = 80
#       target_port = 80
#       node_port   = 30007
#     }

#     type = "NodePort"
#   }
# }