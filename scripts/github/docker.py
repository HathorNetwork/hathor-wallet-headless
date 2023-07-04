import re
import os
import datetime
from typing import Dict

# This regex matches the following:
# - rc1 up to rc999
# - rc.1 up to rc.999
# It will be used to match the second part of the tag name after the dash.
release_candidate_regex = re.compile(r'^rc(\.?)[0-9]{1,3}$')
# This regex matches semver tags, e.g. v1.0.0
version_regex = re.compile(r'^v(\d+)\.(\d+)\.(\d+)$')

def prep_tags(environ: Dict):
    timestamp = str(int(datetime.datetime.now().timestamp()))
    base_ecr_tag = environ.get('AWS_ECR_URL') + ':'
    base_dockerhub_tag = 'docker.io/hathornetwork/hathor-wallet-headless:'

    ref = environ.get('GITHUB_REF')
    sha = environ.get('GITHUB_SHA')
    tags = set()

    if ref.startswith('refs/tags/'):
        git_tag = ref[10:]
        # We accept the tags:
        # - vX.X.X (a release version tag)
        # - vX.X.X-rcX (release condidate tag)
        # - vX.X.X-rc.X (another way to write a release candidate tag)
        # - vX.X.X-<part> (the part will be ignored and this will be treated as a release tag)
        (version, _, part) = git_tag.partition('-')

        if version_regex.match(version):
            # We only create images when the tag is a valid semver
            if release_candidate_regex.match(part):
                # For release candidates we only tag with the github tag
                tags.add(base_ecr_tag + git_tag)
                tags.add(base_dockerhub_tag + git_tag)
            else:
                tags.add(base_ecr_tag + version)
                tags.add(base_ecr_tag + '{}-{}'.format(sha, timestamp))
                tags.add(base_ecr_tag + 'latest')

                tags.add(base_dockerhub_tag + version)
                tags.add(base_dockerhub_tag + '{}-{}'.format(sha, timestamp))
                tags.add(base_dockerhub_tag + 'latest')
    elif ref == 'refs/heads/master':
        # A push to master creates a staging tag
        tags.add(base_ecr_tag + 'staging-{}-{}'.format(sha, timestamp))
    else:
        # A push to any other branch creates a dev tag
        # XXX: We currently do not run on other branches
        tags.add(base_ecr_tag + 'dev-{}-{}'.format(sha, timestamp))

    return tags

def print_output(output: Dict):
    outputs = ['{}={}\n'.format(k, v) for k, v in output.items()]
    with open(os.environ['GITHUB_OUTPUT'], 'a') as f:
        f.writelines(outputs)

if __name__ == '__main__':
    tags = prep_tags(os.environ)
    if tags:
        print_output({'tags': ','.join(tags)})
